export const responseObj = (data) => {
  return {
    code: data.code,
    data: data.data,
    message: data.message
  };
};
