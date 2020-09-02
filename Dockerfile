FROM ubuntu:focal

# install some common packages
RUN apt-get update && apt-get install -y \
        curl \
        wget \
        gnupg \
        build-essential \
        dumb-init \
        rlwrap \
        && rm -rf /var/lib/apt/lists/*

# install node and npm
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash - && \
    apt-get -y install nodejs

RUN npm i -g @atomist/skill@branch-master

WORKDIR "/skill"

COPY bin/start.bash .

WORKDIR "/atm/home"

ENTRYPOINT ["bash", "/skill/start.bash"]
