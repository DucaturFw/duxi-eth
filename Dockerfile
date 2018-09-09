FROM node:alpine
RUN apk add --no-cache --update \
    python \
    python-dev \
    py-pip \
    build-base \
    git

WORKDIR /usr/src/app
# Bundle APP files
COPY . .
RUN yarn
RUN npm i -g npm-run-all
CMD "npm-run-all -s setup start-all"