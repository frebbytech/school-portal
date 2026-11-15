import TextField from '@mui/material/TextField';
import Datetime from 'react-datetime';
import dayjs from "@/lib/dates";

///
import '../../theme/react-datetime.css';

const YearPicker = Datetime.default ? Datetime.default : Datetime;
const CustomYearPicker = ({ label, year, setYear }) => {
  return (
    <YearPicker
      dateFormat='YYYY'
      timeFormat={false}
      value={year}
      initialValue={dayjs().format('YYYY')}
      onChange={(date) => setYear(date.format('YYYY'))}
      closeOnSelect={true}
      renderInput={(params) => {
        return <TextField {...params} label={label} size='small' fullWidth />;
      }}
    />
  );
};

export default CustomYearPicker;
