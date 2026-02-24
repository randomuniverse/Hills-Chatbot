#!/usr/bin/env python3
"""
Batch-fetch product images from Hills website.
Creates a mapping file: product_url -> image_url
"""
import subprocess
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = "https://fxcejrgrzihqbswpwpar.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4Y2VqcmdyemlocWJzd3B3cGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODcyMjcsImV4cCI6MjA4NzQ2MzIyN30.Zy8QDCIm4UPToBHCjOTGAFfcAE3PH01tPIqhLcP4-Dw"

IMG_PATTERN = re.compile(r'https://pxmshare\.colgatepalmolive\.com/PNG_500/[A-Za-z0-9_\-]+\.png')


def fetch_image(url):
    """Fetch a product page and extract the first PNG_500 image URL."""
    if not url or url.endswith(("/dog-food", "/cat-food")):
        return None
    try:
        r = subprocess.run(
            ["curl", "-s", "-L", "--max-time", "10", url],
            capture_output=True, text=True, timeout=15
        )
        matches = IMG_PATTERN.findall(r.stdout)
        return matches[0] if matches else None
    except Exception:
        return None


def main():
    # Get all products
    r = subprocess.run([
        "curl", "-s",
        f"{SUPABASE_URL}/rest/v1/products?select=id,product_name_kr,product_url&order=id",
        "-H", f"apikey: {SUPABASE_KEY}",
        "-H", f"Authorization: Bearer {SUPABASE_KEY}",
    ], capture_output=True, text=True, timeout=30)
    products = json.loads(r.stdout)
    print(f"Total products: {len(products)}")

    # Deduplicate URLs (some broken URLs point to category pages)
    url_set = set()
    to_fetch = []
    for p in products:
        url = p.get("product_url", "")
        if url and not url.endswith(("/dog-food", "/cat-food")) and url not in url_set:
            url_set.add(url)
            to_fetch.append(p)

    print(f"Unique product pages to fetch: {len(to_fetch)}")
    print(f"Skipped (category fallback URLs): {len(products) - len(to_fetch)}")

    # Batch fetch with thread pool
    image_map = {}  # product_url -> image_url

    def process(p):
        url = p["product_url"]
        img = fetch_image(url)
        return url, img, p["product_name_kr"]

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(process, p): p for p in to_fetch}
        done = 0
        for f in as_completed(futures):
            done += 1
            url, img, name = f.result()
            if img:
                image_map[url] = img
            status = "OK" if img else "MISS"
            if done % 10 == 0 or not img:
                print(f"  [{done}/{len(to_fetch)}] {status}: {name[:35]}")

    # Build final mapping: id -> image_url
    id_map = {}
    for p in products:
        url = p.get("product_url", "")
        if url in image_map:
            id_map[str(p["id"])] = image_map[url]

    print(f"\n=== Results ===")
    print(f"Images found: {len(image_map)} unique URLs")
    print(f"Products with images: {len(id_map)}/{len(products)}")

    # Save URL-based mapping (for backend use)
    output_path = "backend/product_images.json"
    with open(output_path, "w") as f:
        json.dump(image_map, f, indent=2)
    print(f"Saved URL mapping to {output_path}")

    # Also save ID-based mapping
    with open("scripts/product_images_by_id.json", "w") as f:
        json.dump(id_map, f, ensure_ascii=False, indent=2)
    print(f"Saved ID mapping to scripts/product_images_by_id.json")


if __name__ == "__main__":
    main()
