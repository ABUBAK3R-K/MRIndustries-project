import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const tryOnAPI = async (personImage, garmentImage) => {
  const formData = new FormData();
  formData.append('person_image', personImage);
  formData.append('garment_image', garmentImage);

  const response = await axios.post(`${API_URL}/tryon`, formData, {
    responseType: 'blob'
  });
  return URL.createObjectURL(response.data);
};

export const measurementsAPI = async (personImage, height) => {
  const formData = new FormData();
  formData.append('person_image', personImage);
  formData.append('user_height', height);

  const response = await axios.post(`${API_URL}/measurements`, formData);
  return response.data;
};

export const recommendAPI = async (profile) => {
  const response = await axios.post(`${API_URL}/recommend`, profile);
  return response.data.recommendations;
};
