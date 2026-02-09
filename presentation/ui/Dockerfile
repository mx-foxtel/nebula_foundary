FROM node:22

# Create and change to the app directory.
WORKDIR /app

# Build arguments for Next.js public env vars (inlined at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_KEY

# Make build args available as env vars during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local business logic to the container image.
COPY . .

# Build the Next.js application.
RUN npm run build

# Tell the world that this container is listening on port 3000.
EXPOSE 3000

# Run the web service on container startup.
CMD [ "npm", "start" ]
