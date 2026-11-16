import { currencyFormatter } from "@/config/currencyFormatter";
import { UserContext } from "@/context/providers/UserProvider";
import dayjs from "@/lib/dates";
import React, { use } from "react";

// const FeeReportTemplate = ({ student, feeData = [] }) => {
//   const { school_info } = use(UserContext);

//   return (
//     <div
//       className="report-container report-card"
//       style={{
//         position: "relative",
//         // maxWidth: "8.5in",
//         height: "11.69in",
//         background: ` linear-gradient(
//           rgba(255, 255, 255, 0.96),
//           rgba(255, 255, 255, 0.96)
//         ),
//         url("${school_info?.badge}")`,
//       }}
//     >
//       <header>
//         <div>
//           <h2>Student Fee Report</h2>
//           <p>{feeData?.academicYear}</p>
//         </div>
//         {school_info?.badge !== null && (
//           <div className="logo">
//             <img
//               alt="school logo"
//               loading="lazy"
//               src={school_info?.badge}
//               style={{
//                 width: 70,
//                 height: 70,
//               }}
//             />
//           </div>
//         )}
//       </header>

//       <section className="student-info">
//         <h3>Student Information</h3>
//         <p>
//           <strong>Name:</strong> {student}
//         </p>
//         <p>
//           <strong>Level:</strong> {feeData?.level}
//         </p>
//         <p>
//           <strong>Term:</strong> {feeData?.term}
//         </p>
//       </section>

//       <section className="fee-summary">
//         <h3>Fee Summary</h3>
//         <table>
//           <thead>
//             <tr>
//               <th>Date</th>
//               <th>Amount Paid (GHS)</th>
//               <th>Outstanding (GHS)</th>
//               <th>Issuer</th>
//             </tr>
//           </thead>
//           <tbody>
//             {(feeData?.payment || []).map((payment, index) => (
//               <tr key={index}>
//                 <td>
//                   {dayjs(new Date(payment?.date || payment?.createdAt)).format(
//                     "Do MMM, YYYY"
//                   )}
//                 </td>
//                 <td>{currencyFormatter(payment?.paid)}</td>
//                 <td>{currencyFormatter(payment?.outstanding)}</td>
//                 <td>{payment?.issuerName}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </section>

//       <section className="totals">
//         <p>
//           <strong>Total Paid:</strong> GHS {feeData?.paid.toFixed(2)}
//         </p>
//         <p>
//           <strong>Outstanding Balance:</strong> GHS{" "}
//           {feeData.payment[feeData.payment?.length - 1]?.outstanding.toFixed(2)}
//         </p>
//       </section>

//       <div
//         style={{
//           position: "absolute",
//           inset: 0,
//           display: "grid",
//           placeItems: "center",
//         }}
//       >
//         <img
//           className="report-logo"
//           // src={"/images/logo.PNG"}
//           src={school_info?.badge}
//           alt="school logo"
//           style={{
//             opacity: 0.03,
//             // width: "6in",
//             // height: "5.5in",
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// export default FeeReportTemplate;

function FeeReportTemplate({ student, feeData = [] }) {
  const { school_info } = use(UserContext);

  return (
    <div
      style={{
        ...styles.container,
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        background: ` linear-gradient(
          rgba(255, 255, 255, 0.96),
          rgba(255, 255, 255, 0.96)
        ),
        url("${school_info?.badge}") no-repeat center center`,
      }}
    >
      {/* Header Section */}
      <div style={styles.header}>
        <img
          src={school_info?.badge}
          alt="school logo"
          style={{
            width: 70,
            height: 70,
          }}
        />
        <h1 style={styles.ssntt}>{school_info?.name}</h1>
        <h2 style={styles.statementTitle}>Fees Statement</h2>
        <p style={styles.name}>{student}</p>
      </div>

      {/* Personal Details Section */}
      <div style={styles.personalDetails}>
        <div style={styles.detailColumn}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>TERM/SEMESTER:</span>
            <span style={styles.detailValue}>{feeData?.term}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>LEVEL:</span>
            <span style={styles.detailValue}>{feeData?.level}</span>
          </div>
        </div>

        {/* <div style={styles.detailColumn}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>SBNTT NO.:</span>
            <span style={styles.detailValue}>DH07603600015</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>CHAUNCARD NO.:</span>
            <span style={styles.detailValue}>GHA-71199-8738-5</span>
          </div>
        </div> */}
      </div>

      <hr style={styles.divider} />

      {/* Three Best Years Section */}
      <div style={styles.salarySection}>
        <h3 style={styles.sectionTitle}>Fees Statement Summary</h3>

        <div style={styles.salaryList}>
          <div style={styles.salaryItem}>
            <span style={styles.salaryLabel}>Total Fees</span>
            <span style={styles.salaryValue}>
              {currencyFormatter(feeData?.fees)}
            </span>
          </div>
          <div style={styles.salaryItem}>
            <span style={styles.salaryLabel}>Amount Paid</span>
            <span style={styles.salaryValue}>
              {currencyFormatter(feeData?.paid)}
            </span>
          </div>
          <div style={styles.salaryItem}>
            <span style={styles.salaryLabel}>Outstanding</span>
            <span style={styles.salaryValue}>
              {/* The balance after the latest payment; before any payment, the whole fee. */}
              {currencyFormatter(outstandingNow(feeData))}
            </span>
          </div>
        </div>
      </div>

      {/* Statement of Monthly Contributions Section */}
      <div style={styles.contributionSection}>
        <h3 style={styles.sectionTitle}>Statement of Fees Payments</h3>
        <p style={styles.contributionDescription}>
          Payment made since the beginning of the term.
        </p>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Amount Paid (GHS)</th>
                <th style={styles.th}>Outstanding (GHS)</th>
                <th style={styles.th}>Payment By</th>
                <th style={styles.th}>Payment Method</th>
                <th style={styles.th}>Issuer</th>
              </tr>
            </thead>
            <tbody>
              {(feeData?.payment || []).map((payment, index) => (
                <tr key={index}>
                  <td style={styles.td}>
                    {dayjs(
                      new Date(payment?.date || payment?.createdAt)
                    ).format("Do MMM, YYYY hh:mm A")}
                  </td>
                  <td style={styles.td}>{currencyFormatter(payment?.paid)}</td>
                  <td style={styles.td}>
                    {currencyFormatter(payment?.outstanding)}
                  </td>
                  <td style={styles.td}>{payment?.payer?.name}</td>
                  <td style={styles.td}>{payment?.paymentMethod}</td>
                  <td style={styles.td}>{payment?.issuerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// What is still owed: the balance stored on the latest payment, or the fee when nothing is paid.
export const outstandingNow = (feeData) => {
  const payments = feeData?.payment || [];
  const last = payments[payments.length - 1]?.outstanding;
  if (last !== undefined && last !== null && !Number.isNaN(Number(last))) return Number(last);
  return Math.max(Math.round(Number(feeData?.fees || 0) * 100) - Math.round(Number(feeData?.paid || 0) * 100), 0) / 100;
};

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#fff",
    color: "#000",
    lineHeight: "1.4",
    position: "relative",
    // maxWidth: "8.5in",
    height: "11.69in",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "20px",
  },
  ssntt: {
    fontSize: "32px",
    fontWeight: "bold",
    margin: "0 0 5px 0",
    color: "#000",
  },
  statementTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#000",
  },
  personalDetails: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  detailColumn: {
    flex: "1",
    padding: "0 10px",
  },
  detailRow: {
    marginBottom: "8px",
  },
  detailLabel: {
    fontWeight: "bold",
    marginRight: "5px",
  },
  detailValue: {
    // No specific styling for values
  },
  divider: {
    border: "none",
    borderTop: "1px solid #000",
    margin: "20px 0",
  },
  salarySection: {
    marginBottom: "30px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
  },
  salaryList: {
    marginBottom: "15px",
  },
  salaryItem: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "5px",
  },
  salaryLabel: {
    fontWeight: "bold",
  },
  salaryValue: {
    fontWeight: "bold",
  },

  contributionSection: {
    marginTop: "30px",
  },
  contributionDescription: {
    margin: "0 0 15px 0",
    fontSize: "14px",
  },
  tableContainer: {
    overflow: "hidden",
    borderRadius: " 0.75rem",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    border: "1px solid #000",
    padding: "5px",
    textAlign: "left",
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
  },
  td: {
    border: "1px solid #000",
    padding: "5px",
    textAlign: "left",
  },
};

export default FeeReportTemplate;
