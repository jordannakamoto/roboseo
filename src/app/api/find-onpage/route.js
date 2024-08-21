// Load OnPage data into program

import { NextResponse } from "next/server";
import fs from 'fs';
import { parse } from 'csv-parse/sync'; // A more robust CSV parsing
import path from 'path';

export async function POST(request) {
    try {
        const data = await request.json();
        const pages = data.pages;
        const dir = data.dir;

        // extract urls from pages
        for each page in pages
        get page url (maybe we use a map)
        get page h1
        to create a new list of processedpages


        // transform pages into filenames
        // example: https.10xlivingctc.com > rendered_https_10xlivingctc.com_html

        // for everyfilename supply as argument to convert.py
        // convert.py will return .md files for each file originating from a page

        // for all .md files, open and scan for processedpages.h1
        /2/ get the text from the markdown paragraph or line immediately following the h1 position
        // append that data to processedpages as page.onpage
        // return processed pages



        return NextResponse.json({ result }, { status: 200 });
    } catch (error) {
        console.error('Failed to process files:', error);
        return NextResponse.json( { message: "ERROR" } , { status: 500 });
    }
}
