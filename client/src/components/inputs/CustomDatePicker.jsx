import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

function CustomDatePicker({
  label,
  date,
  setDate,
  error,
  helperText,
  disableFuture,
  style,
  shouldDisableWeekends,
}) {
  // Function to disable weekends
  const disableWeekends = (date) => {
    if (!date || !shouldDisableWeekends) return false;
    const day = date.day(); // day() returns 0 for Sunday and 6 for Saturday
    return day === 0 || day === 6;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={date}
        onChange={(date) => setDate(date)}
        format="Do MMMM YYYY"
        disableMaskedInput
        disableFuture={disableFuture}
        shouldDisableDate={disableWeekends}
        slotProps={{
          textField: {
            fullWidth: true,
            size: "small",
            error: error,
            helperText: helperText,
          },
        }}
        sx={{ width: "100%", ...style }}
      />
    </LocalizationProvider>
  );
}

export default CustomDatePicker;
