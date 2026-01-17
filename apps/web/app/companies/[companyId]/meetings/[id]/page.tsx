"use client";

import { use } from "react";
import { redirect } from "next/navigation";

export default function MeetingPage({
  params,
}: {
  params: Promise<{ id: string; companyId: string }>;
}) {
  const { id, companyId } = use(params);

  // Redirect to the unified live view
  redirect(`/companies/${companyId}/meetings/${id}/live`);
}
