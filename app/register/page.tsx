import { redirect } from "next/navigation";

// Backward-compatible alias for the cheque register.
// The actual register/list page is /cheques.
export default function RegisterAlias() {
  redirect("/cheques");
}
