import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "AceOne_CRM_Features_Guide.pdf");

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "PDF file not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="AceOne_CRM_Features_Guide.pdf"',
      "Content-Length": String(fileBuffer.length),
    },
  });
}
