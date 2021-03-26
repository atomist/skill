FROM ubuntu:rolling@sha256:5ecc0d5a84c0d82444a97da0391058d01f40d0594e54b065d431092dc5f7ed43

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
RUN curl -sL https://deb.nodesource.com/setup_14.x  | bash - && \
    apt-get -y install nodejs

# Install the Atomist Skill CLI
RUN npm i -g @atomist/skill@next

WORKDIR "/atm/home"

ENTRYPOINT ["atm-skill"]
