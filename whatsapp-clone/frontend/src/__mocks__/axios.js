const axios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  create: jest.fn(() => axios),
};

export default axios;
