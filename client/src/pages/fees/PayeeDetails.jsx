// PayeeDetails.tsx
import React from "react";
import { Modal, Box, Button, Typography } from "@mui/material";
import Input from "@/components/inputs/Input";

const PayeeDetails = ({
  open,
  onClose,
  control,
  handleMakePayment,
  isPending,
}) => {
  return (
    <Modal open={open}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 2,
          borderRadius: 2,
          width: { xs: 300, md: 500 },
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Payer Details
        </Typography>
        <Typography variant="caption" fontWeight="bold" gutterBottom>
          Provide Name and Telephone number of payer
        </Typography>

        {/* Title Field */}
        <Input
          size="small"
          fullWidth
          margin="normal"
          label="Name"
          name="payee.name"
          control={control}
        />
        {/* Title Field */}
        <Input
          size="small"
          fullWidth
          type="tel"
          inputMode="tel"
          margin="normal"
          label="Phone Number"
          name="payee.phonenumber"
          control={control}
        />

        {/* Form Actions */}
        <Box
          sx={{
            textAlign: "right",
            mt: 2,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button
            onClick={onClose}
            disabled={isPending}
            color="secondary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            onClick={handleMakePayment}
            disabled={isPending}
          >
            {isPending ? "Please Wait" : "Make Payment"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default PayeeDetails;
