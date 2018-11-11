FROM node:10-alpine

RUN npm config set unsafe-perm true && \
    npm install npm@latest -g && \
    apk add --no-cache sqlite

# Create app directory
RUN mkdir -p /usr/app/
WORKDIR /usr/app

# Install app dependencies
COPY . /usr/app/
RUN npm install --production

EXPOSE 3000

CMD [ "npm", "start"]
