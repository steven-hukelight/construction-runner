"use client";

import PageHeader from "../components/PageHeader";
import AddNoticeModal from "./AddNoticeModal";
import { getRoleFromClient } from "@/lib/utils/cookies";

const CAN_ADD_NOTICE_ROLES = ["superuser", "admin", "sub_admin", "supervisor", "ADMIN", "SUPERVISOR"];

export default function NoticesHeader() {
  const role = getRoleFromClient();
  const canAddNotice = role && CAN_ADD_NOTICE_ROLES.includes(role);

  return (
    <PageHeader
      title="Notices"
      description="Broadcast important notices to your sites."
      action={canAddNotice ? <AddNoticeModal /> : undefined}
    />
  );
}
