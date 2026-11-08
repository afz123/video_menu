import os
import shutil
from setuptools import setup
from setuptools.extension import Extension
from Cython.Build import cythonize

# Собираем все модули приложения в C-бинарники
modules = []
for root, dirs, files in os.walk("app"):
    for file in files:
        if file.endswith(".py") and file != "__init__.py":
            full_path = os.path.join(root, file)
            mod_name = full_path.replace(os.path.sep, ".").replace(".py", "")
            modules.append(Extension(mod_name, [full_path]))

setup(
    name="videomenu_core",
    ext_modules=cythonize(
        modules,
        compiler_directives={
            "language_level": "3",
            "always_allow_keywords": True
        }
    )
)

