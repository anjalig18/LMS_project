export function payWithRazorpay({ amount, onSuccess }) {
  const options = {
    key: "YOUR_RAZORPAY_KEY_ID",
    amount: amount * 100,
    currency: "INR",
    name: "LMS Payment",
    handler: onSuccess,
    prefill: {
      name: "Student",
      email: "student@example.com"
    },
    theme: {
      color: "#3399cc"
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}
