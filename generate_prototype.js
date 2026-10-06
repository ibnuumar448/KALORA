const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2800, deviceScaleFactor: 2 });
  
  const fileUrl = 'file://' + path.resolve(__dirname, 'prototype.html');
  console.log('Loading ' + fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  await page.screenshot({ path: 'KALORA_YAI_Prototype.png', fullPage: true });
  await browser.close();
  console.log('Saved KALORA_YAI_Prototype.png');
}

run().catch(console.error);
