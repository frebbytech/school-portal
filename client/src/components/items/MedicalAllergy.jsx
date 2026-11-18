import {
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';

function MedicalAllergy({ title, value, setValue, name = 'status' }) {
  return (
    <Stack
      direction='row'
      justifyContent='flex-start'
      alignItems='center'
      spacing={3}
    >
      <Typography
        // fontSize={13}
        variant='body2'
        sx={{ fontWeight: 'bold', width: '40%' }}
      >
        {title}
      </Typography>

      {/* <Divider orientation='vertical' flexItem /> */}
      <RadioGroup
        row
        aria-label={title}
        name={name}
        value={value}
        onChange={setValue}
      >
        <FormControlLabel
          value='Yes'
          control={<Radio size='small' />}
          label='Yes'
          slotProps={{
            typography: {
              sx: {
                fontSize: 12,
              },
            },
          }}
        />
        <FormControlLabel
          value='No'
          control={<Radio size='small' />}
          label='No'
          slotProps={{
            typography: {
              sx: {
                fontSize: 12,
              },
            },
          }}
        />
      </RadioGroup>
    </Stack>
  );
}

export default MedicalAllergy;
