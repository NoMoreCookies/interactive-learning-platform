import {
  CheckoutSuccessClient,
} from "./CheckoutSuccessClient";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    session_id?:
      | string
      | string[];
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params =
    await searchParams;

  const sessionId =
    typeof params.session_id ===
    "string"
      ? params.session_id
      : null;

  return (
    <CheckoutSuccessClient
      sessionId={
        sessionId
      }
    />
  );
}