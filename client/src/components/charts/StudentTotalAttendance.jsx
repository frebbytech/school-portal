import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import { Box } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import dayjs from "@/lib/dates";

function StudentTotalAttendance({ data }) {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Attendance",
        data: [],
        borderColor: "#ffc09f",
        backgroundColor: "#ffc09f",
      },
    ],
  });

  useEffect(() => {
    const labels = data.map((entry) =>
      dayjs(entry.date, "MM/DD/YYYY").format("dddd,(Do MMM)")
    );
    const counts = data.map((entry) => entry.count);

    setChartData({
      labels: labels,
      datasets: [
        {
          label: "Present Students",
          data: counts,
          borderColor: "#ffc09f",
          backgroundColor: "#ffc09f",
          tension: 0.4,
        },
      ],
    });
  }, [data]);

  return (
    <Card elevation={1}>
      <CardHeader avatar={<BarChartRounded />} title={`Total Daily Attendance`} />
      <CardContent>
        <Box
          sx={{
            minWidth: 100,
            width: "100%",
            height: 300,
          }}
        >
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,

              layout: {
                padding: 2,
                autoPadding: true,
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: {
                    // display: false,
                  },
                  grid: {
                    // display: false,
                  },
                },
                y: {
                  ticks: {
                    // display: false,
                  },
                  grid: {
                    // display: false,
                  },
                },
              },
              plugins: {
                legend: {
                  display: true,
                },

                datalabels: {
                  display: true,
                  color: "black",
                  anchor: "center",
                  align: "end",
                  font: {
                    size: "18px",
                  },
                  // backgroundColor: "#000",
                  // borderRadius:'40px',
                  formatter: (value) => value, // Display the data value directly
                },
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

export default StudentTotalAttendance;
