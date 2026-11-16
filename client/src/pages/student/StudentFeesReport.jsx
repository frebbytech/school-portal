import React, {  useRef } from "react";
import { Avatar, Box, Button, Container } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { getStudentFeeHistory } from "@/api/currentFeeAPI";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { useReactToPrint } from "react-to-print";
import { STUDENT_FEES_HISTORY } from "@/mockup/columns/sessionColumns";
import { PrintRounded } from "@mui/icons-material";
import history_icon from "@/assets/images/header/history_ico.svg";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import PaymentTable from "@/components/tables/PaymentTable";
import DataSkeleton from "@/components/skeleton/DataSkeleton";
import { getStudent } from "@/api/studentAPI";
import FeeReportTemplate from "../fees/layout/FeeReportTemplate";

const StudentFeesReport = () => {
  const queryClient = useQueryClient();
  const { state } = useLocation();
  const { studentId } = useParams();
  const componentRef = useRef();

  const studentFee = useQuery({
    queryKey: ["student-fee-history", studentId],
    queryFn: () => getStudentFeeHistory(studentId),
    enabled: !!studentId,
  });

  const { data: student, isPending } = useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: () => getStudent(studentId),
    enabled: !!studentId,
    initialData: {
      profile: queryClient
        .getQueryData(["all-students"])
        ?.find((student) => student?._id === studentId),
      fees: [],
      exams: [],
      parents: [],
    },
    select: (data) => ({
      ...data.profile,
      fullName: data.profile?.fullName || "",
    }),
  });

  const reactToPrintFn = useReactToPrint({
    documentTitle: student?.fullName,
    contentRef: componentRef,
  });

  if (isPending || studentFee.isPending) {
    return <DataSkeleton />;
  }

  return (
    <Container maxWidth="xl">
      {/* <Back to={state?.prevPath} color="primary.main" /> */}
      <CustomTitle
        title={student?.fullName || ""}
        // subtitle={student?.levelType}
        color="primary.main"
        icon={
          <Avatar srcSet={student?.profile} sx={{ width: 60, height: 60 }} />
        }
        showBack={true}
        to={state?.prevPath}
      />

      <Box>
        <>
          <CustomizedMaterialTable
            title="Fees History"
            subtitle="Showing details of student fees transactions"
            search
            icon={history_icon}
            addButtonImg={history_icon}
            addButtonMessage="No Fees History Found"
            isPending={studentFee.isPending}
            exportFileName={student?.fullName}
            columns={STUDENT_FEES_HISTORY}
            data={studentFee?.data}
            actions={[]}
            handleRefresh={studentFee.refetch}
            otherButtons={
              <Button
                startIcon={<PrintRounded />}
                variant="contained"
                onClick={() => reactToPrintFn()}
              >
                Print Report
              </Button>
            }
            options={{
              paging: false,
              selection: false,
              columnsButton: false,
            }}
            style={{
              border: "none",
            }}
            detailPanel={(rowData) => (
              <PaymentTable payments={rowData?.payment} />
            )}
          />
        </>
      </Box>
      <div ref={componentRef} className="print-container">
        {studentFee?.data?.map((data, index) => {
          return (
            <FeeReportTemplate
              key={index}
              feeData={data}
              student={student?.fullName}
            />
          );
        })}
      </div>
      {studentFee.isPending && (
        <LoadingSpinner value="Loading Fee History..." />
      )}
    </Container>
  );
};

export default StudentFeesReport;
