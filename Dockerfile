# 1. Use an official Node.js image
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files first (better caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your code
COPY . .

# 6. Expose the port your server runs on (Matches your server.js)
EXPOSE 5000

# 7. Command to start the app
CMD ["npm", "start"]