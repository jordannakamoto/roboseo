// Load OnPage data into program

import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function POST(request) {
    try {
        const data = await request.json();
        const pages = data.pages;
        const dir = path.join("public", "frog", data.dir, "page_source");

        // Step 1: Transform URLs into filenames
        const filenames = pages.map((page) => {
            const formattedUrl = page.url
                .replace(/https?:\/\//, "https_")
                .replace(/[\/#]/g, "_");
            return `rendered_${formattedUrl}.html`;
        });

        // Step 2: Execute convert.js to extract header/content info
        const scriptPath = path.join("scripts", "convert.js");
        const command = `node ${scriptPath} ${dir} ${filenames.join(" ")}`;
        console.log("command:", command);

        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 10 * 1024 * 1024,
        });

        if (stderr) {
            console.warn("DEBUG stderr from convert.js:\n", stderr);
        }

        const results = JSON.parse(stdout);

        // Step 3: Build processedPages with headers from results
        const processedPages = pages.map((page) => {
            const formattedUrl = page.url
                .replace(/https?:\/\//, "https_")
                .replace(/[\/#]/g, "_");
            const result = results.find(
                (r) => r.file === `rendered_${formattedUrl}.html`
            );

            let h1, h2, h3;

            if (result && result.headerResults) {
                h1 = result.headerResults.find((h) => h.headerTag === "h1")?.headerText;
                h2 = result.headerResults.find((h) => h.headerTag === "h2")?.headerText;
                h3 = result.headerResults.find((h) => h.headerTag === "h3")?.headerText;
            }

            return {
                url: page.url,
                h1,
                h2,
                h3,
            };
        });

        // Step 4: Populate `onpage` content using header and contentResults
        processedPages.forEach((page) => {
            const formattedUrl = page.url
                .replace(/https?:\/\//, "https_")
                .replace(/[\/#]/g, "_");
            const result = results.find(
                (r) => r.file === `rendered_${formattedUrl}.html`
            );

            if (!result || result.error) {
                console.warn(`No result found or error for file: rendered_${formattedUrl}.html`);
                return;
            }

            const { headerResults, contentResults } = result;

            const normalize = (str) =>
                str?.trim().toLowerCase().replace(/\s+/g, " ");
            const matchHeader = (tag, text) =>
                headerResults.find(
                    (h) => h.headerTag === tag && normalize(h.headerText) === normalize(text)
                );

            let headerMatch = page.h1 ? matchHeader("h1", page.h1) : null;
            if (!headerMatch && page.h2) headerMatch = matchHeader("h2", page.h2);
            if (!headerMatch && page.h3) headerMatch = matchHeader("h3", page.h3);

            if (headerMatch) {
                const startLine = headerMatch.headerLineNumber;

                const onPageParagraphs = contentResults
                    .filter(
                        (p) =>
                            p.lineNumber > startLine &&
                            p.lineNumber < startLine + 40 &&
                            p.text.trim().length > 0
                    )
                    .map((p) => p.text.trim())
                    .filter(
                        (text) =>
                            !text.startsWith("!") &&
                            !text.startsWith("*") &&
                            !text.toLowerCase().includes("map") &&
                            !text.toLowerCase().includes("tour") &&
                            !text.toLowerCase().includes("more")
                    );
                    

                if (onPageParagraphs.length > 0) {
                    page.onpage = onPageParagraphs.join("\n\n");
                } else {
                    console.warn(`No clean paragraphs found near header in ${formattedUrl}`);
                }
            } else {
                console.warn(`No matching header found in results for ${formattedUrl}`);
            }
        });

        // Step 5: Return enriched results
        return NextResponse.json({ processedPages }, { status: 200 });
    } catch (error) {
        console.error("Failed to process files:", error);
        return NextResponse.json({ message: "ERROR" }, { status: 500 });
    }
}