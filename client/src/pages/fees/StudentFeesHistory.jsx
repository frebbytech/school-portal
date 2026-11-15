import React, {  useRef } from "react";
import { Avatar, Box, Button } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getStudentFeeHistory } from "@/api/currentFeeAPI";
import QueryError from "@/components/QueryError";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { useReactToPrint } from "react-to-print";
import { STUDENT_FEES_HISTORY } from "@/mockup/columns/sessionColumns";
import { PrintRounded } from "@mui/icons-material";
import history_icon from "@/assets/images/header/history_ico.svg";
import CustomTitle from "@/components/custom/CustomTitle";
import { useSearchParams } from "react-router-dom";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import PaymentTable from "@/components/tables/PaymentTable";
import useLevelById from "@/components/hooks/useLevelById";
import DataSkeleton from "@/components/skeleton/DataSkeleton";
import FeeReportTemplate from "./layout/FeeReportTemplate";

const StudentFeesHistory = () => {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const componentRef = useRef();

  const studentFee = useQuery({
    queryKey: [
      "student-fee-history",
      searchParams.get("_id"),
      searchParams.get("level_id"),
    ],
    queryFn: () => getStudentFeeHistory(searchParams.get("_id")),
    enabled: !!searchParams.get("_id") && !!searchParams.get("level_id"),
  });

  const { students, levelLoading } = useLevelById(searchParams.get("level_id"));

  const student = students?.find(
    (student) => student?._id === searchParams.get("_id")
  );

  const reactToPrintFn = useReactToPrint({
    documentTitle: student?.fullName,
    contentRef: componentRef,
  });

  if (studentFee.isError) {
    return <QueryError what="this student's payments" error={studentFee.error} onRetry={studentFee.refetch} />;
  }

  if (levelLoading || studentFee.isPending) {
    return <DataSkeleton />;
  }

  return (
    <>
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
        {/* <FeeReport student={studentFee?.data} /> */}
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
    </>
  );
};

export default StudentFeesHistory;
