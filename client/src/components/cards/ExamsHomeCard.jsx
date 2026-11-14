import React from 'react';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
function ExamsHomeCard({ title, value, icon, color, hint }) {
  return (
    <Stack
      direction='row'
      spacing={2}
      sx={{
        bgcolor:'white',
        px: 2,
        py:2,
        borderRadius: 2,
        boxShadow: '20px 20px 60px #d9d9d9,-20px -20px 60px #ffffff',
        // borderLeft: `2px solid #012E54`,
      }}
    >
      <Avatar
        sx={{
          width: 24,
          height: 24,
          color: `${color}.dark`,
          bgcolor: `${color}.lighter`,
        }}
      >
        {icon}
      </Avatar>

      <Stack spacing={1}>
        <Typography variant='body2'>{title}</Typography>
        <Typography variant='h5'>{value}</Typography>
        {hint ? (
          <Typography variant='caption' color='text.secondary'>
            {hint}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
ExamsHomeCard.propTypes = {
  title: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  hint: PropTypes.string,
  icon: PropTypes.node,
  color: PropTypes.string,
};

export default ExamsHomeCard;
