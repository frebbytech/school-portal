import dayjs from "@/lib/dates";
import * as XLSX from "xlsx";

export const getItem = (key) => {
  return JSON.parse(localStorage.getItem(key));
};

export const saveItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const removeItem = (key) => {
  return localStorage.removeItem(key);
};

export const isWeekend = (date) => {
  const day = dayjs(date).day();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

export function getLevelInitials(name) {
  if (!name) return "";

  // Split by spaces, filter out empty parts, and map to uppercase initials
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join(".");

  return initials;
}

// Convert Base64 to Blob and create Object URL
// const base64ToBlobUrl = (base64) => {
//   // Split the Base64 string into parts
//   const parts = base64.split(";base64,");
//   const contentType = parts[0].split(":")[1];
//   const raw = window.atob(parts[1]);
//   const rawLength = raw.length;
//   const uInt8Array = new Uint8Array(rawLength);

//   for (let i = 0; i < rawLength; ++i) {
//     uInt8Array[i] = raw.charCodeAt(i);
//   }

//   const blob = new Blob([uInt8Array], { type: contentType });
//   return URL.createObjectURL(blob);
// };

export const getLastPathname = (path) => {
  const segments = path?.split("/").filter(Boolean); // Remove empty segments
  return segments.length ? segments[segments.length - 1] : "/";
};

export function generateRandomRGBAColors(count = 10) {
  const colors = [];

  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * 256); // Red: 0-255
    const g = Math.floor(Math.random() * 256); // Green: 0-255
    const b = Math.floor(Math.random() * 256); // Blue: 0-255
    // const a = Math.random().toFixed(2); // Alpha: 0.00-1.00

    colors.push(`rgb(${r}, ${g}, ${b})`);
  }

  return ["rgb(255, 192, 159)", " rgb(1, 46, 84)", ...colors];
}

export function generateRGBAColorsBetween(
  minColor = { r: 1, g: 46, b: 84 },
  maxColor = { r: 255, g: 192, b: 159 },
  count = 10
) {
  const colors = [];

  for (let i = 0; i < count; i++) {
    const r = Math.floor(
      Math.random() * (maxColor.r - minColor.r) + minColor.r
    );
    const g = Math.floor(
      Math.random() * (maxColor.g - minColor.g) + minColor.g
    );
    const b = Math.floor(
      Math.random() * (maxColor.b - minColor.b) + minColor.b
    );
    const a = Math.random().toFixed(2); // alpha from 0.00 to 1.00

    colors.push(`rgba(${r}, ${g}, ${b}, ${a})`);
  }

  return colors;
}

export const validateExcelHeaders = async (file, expectedHeaders) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // Convert the sheet to JSON but include headers
  const sheetJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // First row = headers
  const headers = sheetJson[0].map((h) => h?.toString().trim());
  const normalize = (str) => str.toLowerCase().trim();

  // Compare
  const missing = expectedHeaders.filter((h) => !headers.includes(h));
  expectedHeaders
    .map(normalize)
    .filter((h) => !headers.map(normalize).includes(h));

  const extra = headers
    .map(normalize)
    .filter((h) => !expectedHeaders.map(normalize).includes(h));

  return { valid: missing.length === 0 && extra.length === 0, missing, extra };
};
