import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ message: "breaking news: no one's coming to help you twin ✌🏼" });
}
