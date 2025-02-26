#!/bin/sh
nginx &
dotnet /webapi/API_56Cards.dll
