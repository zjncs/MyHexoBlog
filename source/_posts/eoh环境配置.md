---
title: eoh环境配置
author: Johnny-Zhao
tags:
  - 环境配置
categories:
  - llm+
date: 2025-08-13 21:20:18
---

by zjn

1.克隆一下源码

```bash
git clone https://github.com/FeiLiu36/EOH/
```

2.进入源码目录，创建虚拟环境

我家里的电脑没有装conda，所以我用的是Python自带的`venv`，如果你有conda，可以用conda创建虚拟环境。

```bash
python -m venv eoh_env
```

然后激活虚拟环境:

```bash
source eoh_env/Scripts/activate
```

记得虚拟环境的Python版本要>3.10

可以确定一下：

```bash
python --version
```

3.安装依赖

```bash
#基础依赖
pip install numpy numba joblib
```

![image-20250812234415782](C:\Users\22692\AppData\Roaming\Typora\typora-user-images\image-20250812234415782.png)

在这个目录下，直接

```bash
pip install -r requirements.txt
```

也可以

4.配置llm参数

![image-20250812234524030](C:\Users\22692\AppData\Roaming\Typora\typora-user-images\image-20250812234524030.png)

按照官网的指示，我选择了

###### 示例1：旅行商问题的构造算法

```
cd examples/tsp_construct

python runEoH.py
```

但是需要先去买api

[DeepSeek 开放平台](https://platform.deepseek.com/usage)

![image-20250813000015718](C:\Users\22692\AppData\Roaming\Typora\typora-user-images\image-20250813000015718.png)

在runEoH里面改一下参数

理论上就可以跑

但是，可能会遇到timeout

```bash
PS C:\Users\zny\Desktop\eoh\EoH-main\eoh> & C:\Users\zny\Desktop\eoh\eoh_env\Scripts\python.exe c:/Users/zny/Desktop/eoh/EoH-main/examples/tsp_construct/runEoH.py
----------------------------------------- 
---              Start EoH            ---
-----------------------------------------
- output folder created -
-  parameters loaded -
- Prob tsp_construct loaded 
- EoH parameters loaded -
- Evolution Start -
- check LLM API
remote llm api is used ...
creating initial population:
Parallel time out .
Parallel time out .
Pop initial: 

initial population has been created!
 OP: e1, [1 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: e2, [2 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m1, [3 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m2, [4 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
Traceback (most recent call last):
  File "c:\Users\zny\Desktop\eoh\EoH-main\examples\tsp_construct\runEoH.py", line 22, in <module>
    evolution.run()
  File "C:\Users\zny\Desktop\eoh\EoH-main\eoh\src\eoh\eoh.py", line 42, in run
    method.run()
  File "C:\Users\zny\Desktop\eoh\EoH-main\eoh\src\eoh\methods\eoh\eoh.py", line 177, in run
    json.dump(population[0], f, indent=5)
              ~~~~~~~~~~^^^
IndexError: list index out of range
```

![image-20250813000210705](C:\Users\22692\AppData\Roaming\Typora\typora-user-images\image-20250813000210705.png)

找到utils getParas

![image-20250813000238820](C:\Users\22692\AppData\Roaming\Typora\typora-user-images\image-20250813000238820.png)

timeout设的高一点，但没有完全解决问题，推测可能是r1模型不是很聪明，因为花了大几万token只找到一个解

或许也可以降低tsp问题的复杂度

```python
(eoh_env) PS C:\Users\zny\Desktop\eoh\EoH-main\eoh> & C:\Users\zny\Desktop\eoh\eoh_env\Scripts\python.exe c:/Users/zny/Desktop/eoh/EoH-main/examples/tsp_construct/runEoH.py
-----------------------------------------
---              Start EoH            ---
-----------------------------------------
- output folder created -
-  parameters loaded -
- Prob tsp_construct loaded
- EoH parameters loaded -
- Evolution Start -
- check LLM API
remote llm api is used ...
creating initial population:
Pop initial: 
 Obj:  7.03416| Obj:  7.50039| Obj:  11.58909|
initial population has been created!
 OP: e1, [1 / 4] | Obj:  7.65304| Obj:  7.59725| Obj:  9.37639| Obj:  7.45505|
 OP: e2, [2 / 4] | Obj:  7.6436| Obj:  8.47352| Obj:  8.59245| Obj:  8.47352|
 OP: m1, [3 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m2, [4 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
--- 1 of 4 populations finished. Time Cost:  30.6 m
Pop Objs:  7.03416 7.45505 7.50039 7.59725
 OP: e1, [1 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: e2, [2 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m1, [3 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m2, [4 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
--- 2 of 4 populations finished. Time Cost:  36.9 m
Pop Objs:  7.03416 7.45505 7.50039 7.59725
 OP: e1, [1 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: e2, [2 / 4] | Obj:  7.45505| Obj:  10.23619| Obj:  7.57794| Obj:  8.05993|
 OP: m1, [3 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m2, [4 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
--- 3 of 4 populations finished. Time Cost:  50.8 m
Pop Objs:  7.03416 7.45505 7.50039 7.57794
 OP: e1, [1 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: e2, [2 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m1, [3 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
 OP: m2, [4 / 4] | Obj:  None| Obj:  None| Obj:  None| Obj:  None|
--- 4 of 4 populations finished. Time Cost:  57.1 m
Pop Objs:  7.03416 7.45505 7.50039 7.57794
> End of Evolution!
-----------------------------------------
---     EoH successfully finished !   ---
```

虽然成功finish

但是m1和m2的obj都是None

说明修改策略都超时了，因为e1和e2都简单一些所以成功了



