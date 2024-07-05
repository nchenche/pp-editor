#!/usr/bin/env python

from setuptools import find_packages, setup

VERSION = "0.0.0"

requires = [
    "flask==3.0.2",
    "flask-cors==4.0.0",
    "pyPept @ git+https://github.com/Boehringer-Ingelheim/pyPept.git"
]

# dependency_links = [
#     "git+https://github.com/Boehringer-Ingelheim/pyPept.git#egg=pyPept"
# ]

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