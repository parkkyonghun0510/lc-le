import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import NewApplicationPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/ThemeProvider";

const queryClient = new QueryClient();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" useBackendSettings={false}>
        {ui}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe("NewApplicationPage", () => {
  test("renders the first step by default", () => {
    renderWithProviders(<NewApplicationPage />);
    expect(screen.getByText("Customer Information")).toBeInTheDocument();
  });

  test("updates customer name input correctly", () => {
    renderWithProviders(<NewApplicationPage />);
    const customerNameInput = screen.getByRole('textbox', { name: /customer name/i }) as HTMLInputElement;
    fireEvent.change(customerNameInput, { target: { value: "John Doe" } });
    expect(customerNameInput.value).toBe("John Doe");
  });

  test("moves to the next step when the 'Next' button is clicked", () => {
    renderWithProviders(<NewApplicationPage />);
    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);
    expect(screen.getByText("Loan Information")).toBeInTheDocument();
  });
});