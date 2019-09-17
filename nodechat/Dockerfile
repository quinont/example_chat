FROM node:stretch-slim

RUN mkdir /file
WORKDIR /file

COPY . /file

RUN npm install
RUN npm audit fix
EXPOSE 5000
CMD ["npm", "start"]
