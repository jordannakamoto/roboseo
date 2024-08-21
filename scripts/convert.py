# For converting html to markdown before extracting on page data

import os
import sys
import html2text

def convert_html_to_markdown(directory, filename):
    # Generate the full path to the HTML file and the expected markdown output filename
    html_file_path = os.path.join(directory, filename)
    md_file_path = html_file_path.replace('.html', '.md')
    print("running convert.py")
    print(html_file_path)
    print(md_file_path)
    
    # Check if the markdown file already exists
    if not os.path.exists(md_file_path):
        # Read the HTML content
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Convert HTML to Markdown
        markdown_content = html2text.html2text(html_content)
        
        # Write the Markdown content to a new .md file
        with open(md_file_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)

        print(f"Converted {filename} to {md_file_path}.")
    else:
        print(f"{md_file_path} already exists, skipping {filename}.")

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert.py <directory_path> <html_file1> <html_file2> ...")
        sys.exit(1)

    directory = sys.argv[1]
    html_files = sys.argv[2:]

    for html_file in html_files:
        if html_file.endswith('.html'):
            convert_html_to_markdown(directory, html_file)
        else:
            print(f"Skipping {html_file} (not an HTML file)")

if __name__ == "__main__":
    main()