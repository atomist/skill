FROM ubuntu:rolling@sha256:8f6f3f52f4369200f9b446a47d98e194e30bc554e667a98cdddd4f30e9549ea5

# Install some common packages
RUN apt-get update && apt-get install -y \
        curl \
        wget \
        gnupg \
        build-essential \
        dumb-init \
        rlwrap \
        && rm -rf /var/lib/apt/lists/*

# Install node and npm
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash - && \
    apt-get -y install nodejs

# Install the Atomist Skill CLI
RUN npm i -g @atomist/skill@next

WORKDIR "/skill"

COPY bin/start.bash .

WORKDIR "/atm/home"

ENTRYPOINT ["bash", "/skill/start.bash"]
