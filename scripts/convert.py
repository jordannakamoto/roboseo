import os
import sys
from bs4 import BeautifulSoup

def extract_headers_and_text(directory, filename):
    # Generate the full path to the HTML file
    html_file_path = os.path.join(directory, filename)
    print("Processing:", html_file_path)

    # Check if the file exists
    if not os.path.exists(html_file_path):
        print(f"File {html_file_path} does not exist.")
        return
    
    # Read the HTML content
    with open(html_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract headers (h1, h2, h3) and their next valid text
    results = []
    for header in soup.find_all(['h1', 'h2', 'h3']):
        next_sibling = header.find_next_sibling()
        while next_sibling:
            if next_sibling.name:  # Ignore non-tag elements like comments or whitespace
                text = next_sibling.get_text(strip=True)
                if len(text) > 50:  # Adjust the length threshold as needed
                    results.append((header.name, header.get_text(strip=True), text))
                    break
            next_sibling = next_sibling.find_next_sibling()
    
    # Print or save the results
    for header_tag, header_text, text in results:
        print(f"{header_tag.upper()}: {header_text}")
        print(f"Text: {text}\n")
    
    return results

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert.py <directory_path> <html_file1> <html_file2> ...")
        sys.exit(1)

    directory = sys.argv[1]
    html_files = sys.argv[2:]       

    for html_file in html_files:
        if html_file.endswith('.html'):
            extract_headers_and_text(directory, html_file)
        else:
            print(f"Skipping {html_file} (not an HTML file)")

if __name__ == "__main__":
    main()