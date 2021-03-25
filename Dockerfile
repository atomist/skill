FROM ubuntu:rolling@sha256:37586e1b9bab0a851b639c9102b002475987c336fa3433fa01b6abf98dfdc2a7

# Install some common packages
RUN apt-get update && apt-get install -y \
        build-essential \
        && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
        curl \
        wget \
        gnupg \
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
