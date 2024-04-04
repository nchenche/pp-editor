#!/usr/bin/env python

from setuptools import find_packages, setup

VERSION = "0.0.0"

requires = [

]

setup(
    name="ppeditorAPI",
    version=VERSION,
    author="nche",
    description="Simple application to visualize 3D molecules and share their representation in real-time.",
    packages=find_packages(include=['app', 'app.*']),
    zip_safe=False,
    install_requires=requires,
    # include_package_data=True,
    # package_data={"templates": ["**"]},
)