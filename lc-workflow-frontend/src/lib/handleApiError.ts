import toast from 'react-hot-toast';

export const handleApiError = (error: any, defaultMessage: string) => {
  let message = defaultMessage;

  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail.map((err) => err.msg || 'An error occurred').join('\n');
  } else if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      message = errors.map((err: any) => err.msg || 'Validation error').join('\n');
    }
  } else if (error.response?.status === 422) {
    message = 'Invalid data provided';
  } else if (error.response?.status === 423) {
    message = 'Account temporarily locked due to multiple failed login attempts';
  }

  toast.error(message);
};