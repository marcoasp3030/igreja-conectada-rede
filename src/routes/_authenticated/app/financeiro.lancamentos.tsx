import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage } from "@/components/finance/transactions-page";

export const Route = createFileRoute("/_authenticated/app/financeiro/lancamentos")({
  component: () => <TransactionsPage tipo="entrada" />,
});
