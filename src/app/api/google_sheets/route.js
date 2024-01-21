// pages/api/loadsheet.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { accessToken, spreadsheetId, range } = req.body;

    try {
      const sheets = google.sheets({ version: 'v4', auth: accessToken });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      res.status(200).json(response.data.values);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
