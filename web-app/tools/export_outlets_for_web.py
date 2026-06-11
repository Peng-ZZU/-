import json
import re
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = Path(__file__).resolve().parents[1]


def clean(value):
    return "" if value is None else str(value).strip()


def parse_area(address):
    city_match = re.search(r"河南省(.+?市)", address)
    city = city_match.group(1) if city_match else ""
    district = ""
    if city:
        rest = address.split(city, 1)[1]
        district_match = re.search(r"(.+?(?:区|县|市))", rest)
        district = district_match.group(1) if district_match else ""
    else:
        district_match = re.search(r"河南省(.+?(?:区|县|市))", address)
        district = district_match.group(1) if district_match else ""
    return city, district


def find_excel():
    files = [
        p
        for p in ROOT.glob("*.xlsx")
        if not p.name.startswith("~$") and p.stat().st_size > 0
    ]
    if not files:
        raise FileNotFoundError("没有找到网点信息 Excel 文件")
    return files[0]


def main():
    workbook = openpyxl.load_workbook(find_excel(), read_only=True, data_only=True)
    sheet = workbook.worksheets[0]
    outlets = []

    for row in sheet.iter_rows(min_row=2, values_only=True):
        code = clean(row[0])
        if not code:
            continue
        name = clean(row[1])
        parent_name = clean(row[2])
        address = clean(row[3])
        leader = clean(row[4])
        longitude = clean(row[5])
        latitude = clean(row[6])
        city, district = parse_area(address)
        search_text = " ".join(
            [code, name, parent_name, address, leader, city, district]
        ).lower()
        outlets.append(
            {
                "code": code,
                "name": name,
                "parentName": parent_name,
                "address": address,
                "leader": leader,
                "longitude": longitude,
                "latitude": latitude,
                "city": city,
                "district": district,
                "searchText": search_text,
            }
        )

    target_dir = WEB_ROOT / "data"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "outlets.json"
    target.write_text(json.dumps(outlets, ensure_ascii=False), encoding="utf-8")
    print(f"exported {len(outlets)} outlets to {target}")


if __name__ == "__main__":
    main()
