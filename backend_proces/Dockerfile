FROM python:3.10

RUN apt-get update \
    && apt-get install -y cron xvfb libfontconfig vim supervisor \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /app
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN pip install pip==21.3.1
RUN pip install "setuptools<58.0"

COPY requirements.txt /app/
RUN pip install -r requirements.txt
RUN pip install --upgrade typing-extensions

COPY . /app/

