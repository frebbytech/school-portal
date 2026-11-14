import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ExamSummary from "./ExamSummary";

const pilotCase = { noOfStudents: 50, enteredStudents: 1, completeStudents: 1, incompleteStudents: 49, highestMarks: 504, lowestMarks: 504, maxScore: 700, passStudents: 1, failStudents: 0, resultsCompleted: 2 };

describe("exam summary cards", () => {
  it("does not report students without results as failed", () => {
    render(<ExamSummary data={pilotCase} />);
    const failed = screen.getByText("Failed").closest("div");
    expect(failed).toHaveTextContent("0");
    expect(screen.getByText("Results not complete").closest("div")).toHaveTextContent("49");
  });

  it("shows the scale beside the highest and lowest scores", () => {
    render(<ExamSummary data={pilotCase} />);
    expect(screen.getAllByText("out of 700")).toHaveLength(2);
    expect(screen.getByText("Highest score").closest("div")).toHaveTextContent("504");
  });

  it("shows a dash and a note, not 0, while no results exist", () => {
    render(<ExamSummary data={{ noOfStudents: 4, enteredStudents: 0, completeStudents: 0, incompleteStudents: 4, highestMarks: 0, lowestMarks: 0 }} />);
    expect(screen.getAllByText("No results yet")).toHaveLength(2);
  });

  it("hides the not-complete card for an older server", () => {
    render(<ExamSummary data={{ noOfStudents: 5, highestMarks: 10, lowestMarks: 0, passStudents: 1, failStudents: 4 }} />);
    expect(screen.queryByText("Results not complete")).not.toBeInTheDocument();
    expect(screen.getByText("Failed").closest("div")).toHaveTextContent("4");
  });
});
