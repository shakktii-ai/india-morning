import "dotenv/config";
import { db } from "@/src/lib/firebase-admin";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";

const XML_PATH = path.join(process.cwd(), "indiamorning-in-advanced-ads-export-2025-12-23.xml");

async function main() {
    if (!fs.existsSync(XML_PATH)) {
        console.error(`XML config file not found at ${XML_PATH}`);
        return;
    }

    const xmlData = fs.readFileSync(XML_PATH, "utf-8");
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);

    const options = jsonObj["advads-export"]?.options;
    if (!options) {
        console.error("Invalid ads export format");
        return;
    }

    const adsense = options["advanced-ads-adsense"];
    const pubId = adsense ? adsense["adsense-id"] : null;
    console.log("Found Publisher ID:", pubId);

    const adsTxt = options["advanced_ads_ads_txt"]?.networks?.adsense?.rec;
    console.log("Found Ads.txt content:", adsTxt);

    if (pubId) {
        await db.collection("system_configs").doc("adsense_publisher_id").set({
            key: "adsense_publisher_id",
            value: pubId,
            updatedAt: new Date().toISOString()
        });
        console.log("Saved adsense_publisher_id");
    }

    if (adsTxt) {
        await db.collection("system_configs").doc("ads_txt_content").set({
            key: "ads_txt_content",
            value: adsTxt,
            updatedAt: new Date().toISOString()
        });
        console.log("Saved ads_txt_content");
    }
}

main().catch(console.error);
