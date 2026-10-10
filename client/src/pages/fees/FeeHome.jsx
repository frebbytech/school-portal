import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Container, IconButton, ListItemText } from "@mui/material";
import FeesDashboardCard from "@/components/cards/FeesDashboardCard";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { getAllCurrentFeesSummary } from "@/api/currentFeeAPI";
import { UserContext } from "@/context/providers/UserProvider";
import { EMPTY_IMAGES } from "@/config/images";
import teacher_icon from "@/assets/images/header/teacher_ico.svg";
import moment from "moment";
import CustomTitle from "@/components/custom/CustomTitle";
import { useNavigate } from "react-router-dom";
import MonthlyFeePaymentChart from "@/components/charts/MonthlyFeePaymentChart";
import WeeklyFeePaymentChart from "@/components/charts/WeeklyFeePaymentChart";
import { Refresh } from "@mui/icons-material";
const FeeHome = () => {
  const {
    session: { sessionId, termId, from, to },
  } = useContext(UserContext);
  const navigate = useNavigate();

  const feeSummary = useQuery({
    queryKey: ["current-fees-summary"],
    queryFn: () =>
      getAllCurrentFeesSummary({ session: sessionId, term: termId, from, to }),
    enabled: !!sessionId && !!termId,
    initialData: {
      recentFees: [],
      today: 0,
      week: 0,
      month: 0,
      term: 0,
      monthlyProjection: {
        labels: [""],
        datasets: [],
      },
      weeklyProjection: {
        labels: [""],
        datasets: [],
      },
    },
  });

  const handleMakePayment = () => {
    navigate(`/fee/history`);
  };

  return (
    <>
      <CustomTitle
        title="Fees Payment"
        subtitle="Track and manage school fee payments and financial records efficiently to maintain fiscal responsibility."
        img={teacher_icon}
        color="primary.main"
        right={
          <IconButton onClick={feeSummary.refetch}>
            <Refresh sx={{ width: 36, height: 36 }} />
          </IconButton>
        }
      />

      <Box
        sx={{
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 2,
          py: 3,
        }}
      >
        <FeesDashboardCard text="Today" value={feeSummary?.data?.today} />
        <FeesDashboardCard text="Week" value={feeSummary?.data?.week} />
        <FeesDashboardCard text="This Month" value={feeSummary?.data?.month} />
        <FeesDashboardCard
          text="Term/Semester"
          value={feeSummary?.data?.term}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(1fr,1fr))",
          gap: 2,
        }}
      >
        <MonthlyFeePaymentChart data={feeSummary?.data?.monthlyProjection} />
        <WeeklyFeePaymentChart data={feeSummary?.data?.weeklyProjection} />
      </Box>

      <CustomizedMaterialTable
        isPending={feeSummary.isPending}
        title="Recent Payments"
        subtitle="Recent payment made within the term / semester"
        icon={teacher_icon}
        columns={[
          {
            title: "Date of Payment",
            field: "date",
            type: "date",
            render: ({ date }) => (
              <ListItemText
                primary={moment(date).format("ddd,LL")}
                secondary={moment(date).format("hh:mm a")}
                slotProps={{
                  secondary: {
                    color: "secondary.main",
                  },
                }}
              />
            ),
          },
          {
            title: "Student",
            field: "student",
          },
          {
            title: "Level",
            field: "level",
          },
          {
            title: "Amount Paid",
            field: "paid",
          },
          {
            title: "Outstanding",
            field: "outstanding",
          },
        ]}
        data={feeSummary?.data?.recentFees}
        actions={[]}
        showAddButton={true}
        addButtonImg={EMPTY_IMAGES.level}
        addButtonMessage=" No recent fee payment !"
        addButtonText="View More"
        onAddButtonClicked={handleMakePayment}
        options={{
          showSelectAllCheckbox: false,
          selection: false,
        }}
      />
    </>
  );
};

export default FeeHome;
