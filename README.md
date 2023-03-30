Type: Jupyter Notebook Extension
Compatibility: 4.x, 5.x
Name: Mloops
Main: mloops.js
Link: README.md
Description:

# Installing The Mloops Jupyter Notebook Extensions

## Prerequisites and Requirements 
Before proceeding, you should make sure that you have Jupyter Notebook installed on your system. If you don't have Jupyter Notebook installed, you can download and install it by following the instructions on the official Jupyter Notebook website: https://jupyter.org/install.

Other Requirements - python libraries:
- pandas
- numpy
- random
- scipy

## Installing an Extension
To install a Jupyter Notebook extension, you can use either the conda package manager or pip package manager. The conda command is recommended if you installed Jupyter Notebook using Anaconda or Miniconda, while the pip command is recommended for other installations.

Open a command prompt or terminal window.

Identify the extension you want to install. You can find a list of extensions on the Jupyter Notebook extensions website or through a search engine.

Install the extension using either conda or pip. For example, to install the Table of Contents (TOC) extension using conda, you can run the following command:
conda install -c conda-forge jupyter_contrib_nbextensions

If you prefer to use pip, you can run:
pip install jupyter_contrib_nbextensions

After the instalation is complete, go to the path: <your_python_folder>/site-packages/jupyter_contrib_nbextensions/nbextensions

Download the Mloops extension and move it to the nbextensions folder.

Finally, enable the extension by executing this command in the terminal:
sudo jupyter nbextension install Mloops-for-Jupyter-main && jupyter nbextension enable Mloops-for-Jupyter-main/mloops

## Congratulations! 
### You have successfully installed our Jupyter Notebook extension.
### We would love to hear your feedback for improvment at - info@m-loops.com
