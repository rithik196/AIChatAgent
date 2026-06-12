[Mobile%20app%20Process%20flow.xlsx](file;file:///d%3A/workflow-agent/AiAgentChat/Mobile%20app%20Process%20flow.xlsx) 

ohk let  me give you a simple walkthrough about  current  state of the project while running it personally as you implemented the flow complety by yourself using the excel sheet process flow but theri are certain loops in the flow 
i will mention what things are working properly and what need to be updated properly 

first i will proceed with NTB journey i will tell you what is happening right now if its properly done ohk otherwise will tell you what has to done 
journey starts (i am writing in short for now about steps dont take it as widgets heading or what to write on that ask if dont undertood anything)
1) agent ask for national id - user gives it (correctly done)
2) we are showing dummy mobile notfication push for NAFATH PIN for user to enter in his mobile (correctly done )
3)then for approving the request dummy we have added 5 second loader 
4)then verifying otp widget (correctly done )
5)then otp verified otp widget (correctly done )
6) then running dedupe check loader and finds the customer is NTB or ETB based  on DB details  (correctly done - we have two customer data in db one is NTB and one is ETB)
7) then if the customer is NTB  
7.1) the agent explains the upcoming jounrey to it  what will he go through the process what will be the steps (done but make UI modification like image kept in NewUser/UI_image/5 steps explained UI.png )
7.2) this is where  ETB journey start - if the customer is ETB we have to populate pre approved offer  formulae and amount all are given in excel (for now nothing is showing blank message is their )(formulae and IBAN master tabs in sheet - check properly as their are rules also written for NTB and ETB seperately in them )

*will complete NTB first now *
8) now customer  details are populated in a widget (from database based on national ID (done but some fields are missing in the UI check all sections personal,address , employemnt , income - check in excel in field requirement  tab it has all data and fields with  rules- check description and remarks understood  (all data is their in db.py file just help yourself from their ) ) - rest the data showing widget it ohk (we have modify and continue two buttons there)
8.1) - if user wants to modify he clicks modify button after which you are showing message and widget asking same question which section to modify remove question show  only widget here 
-- in the widget for address update show City and House Type as dropdowns but for full address just ask if he wants to add new full address and ask in conversation not show text area to add new address in widget 
--- for update employment details showing fields is ohk but then ask the customer to upload the document for verification then only enable the document upload icon in the chat bar  ohk and dont show seperate document uploader in the widget (ask to upload document in conversation way after user field the new data in the widget fields ) only after document upload show updating widget and then update the original data ohk 
---- for income details ask the user to write his updated income in the chat ("Min Value- 5,000
 / Max Value- 200,000") then tell him he has to proof of  income details by choosing any of two things Upload bank statement (for bank statement uplaod stated by the user enable the document upload icon in the chat bar for doc uplaod and then show the updated income in the personal details tab in income section)or by open banking  ( if user say by  open banking we have to show a  show message -- An email has been sent to your registered ID. Please link your account 
then after 3 sec show a loader of updating your details for 3 sec then show the updated income in the personal details tab in income section

---- after every update of details you have to update and show details in the main perosnal detials widget right now its not happeing later we will update direclty them in DB ohk 

9) only after confirm and continue btn click in personal details widget, the journey goes to  Expenses calculation card in which the user files it average monlty expenses and at bottom it auto adds to show the total 
(for now if person goes direct to expense the fields should be empty 
but for Open banking choosen in income verification process the details should be auto populated just show them to review and confirm to move forward ) 
10 ) after confirming the user is asked for consent to fetch Bureau records (SIMAH)  (right now its showing bureau consent widget but also showing personalized offer chat message it should not be visible here )
11) after clicking yes i consent show a loader for 3 sec  showing initialting eligibility check for you (running due deligence and Regulatory checks  )  
12) then populate the max eligible amount and eligibilty status like shown in the image (make UI modification like image kept in NewUser/UI_image/eligible_status.png )
12.1)  if user ask for higher amount then show a loader and show BackofficeWOrkitemWidget (update the widget like this shown in image NewUser/UI_image/Backoffice_send_widget.png )
13) if user accepts the offer then  Ask customer to select desired finance amount & tenure using slider  (this step  UI should look like shown in the image (make UI modification like image kept in NewUser/UI_image/accept_eligible_status.png ))
14)after user selects the desired and proceed then show the user summary of the offer he hold now in financesummarywidegt (show this step like  like image kept in NewUser/UI_image/summary_amount.png ))
- if user clicks need higher amount then show previous widget so that user can change or update the amount and other things 
15) (UI like shown in image kept in NewUser/UI_image/comodity_trade_screen.png  )if user clicks yes I authorize then proceed to  comodity transaction happens
then loader 3sec (NewUser/UI_image/comodity_trade_screen_2.png) and then comodity transaction successfull ( NewUser/UI_image/comodity_trade_screen_3.png)widget stating - Your Murabaha transaction has been completed. 
16)after this  generate a dummy pdf as showing comodity transaction certificate (give option to download also )  (UI should look like in NewUser/UI_image/generate_comodity_cert.png)  on document click user should also able to view the doc their on screen only 
17)after user clicks proceed to E-Sign  btn two Contract and Promisary Note  document for esign will like shown in image NewUser/UI_image/generate_C&P_Note.png
18) after user clicks a email will be send to user for esign the documents in the email show a message email sent and after that 5 sec loader after which  proceeds to next step IBAN selection likeshown in NewUser/UI_image/IBAN_show&select.png  image also if user selectes to add new account he should type that in chat box and then you save that (check IBAN master sheet in excel for data use them)

19)after submit click show loader of IBAN validation and then show its details like Populate IBAN, Bank name & Beneficiary Name in a widgets (check IBAN master sheet in excel for data use them)  give a btn to proceed 
20)after user proceeds then populate the details collected for disbursement of the amount like shown in NewUser/UI_image/Summary_DetailsCard.png

21) if user proceeds further then we have to take a final verification to authorize the transaction 
using OTP verification and IVR Verification
- if user selects OTP then ask him to input a 6 digit otp send to his / her registered mobile number then he types the 6 digit in chat bar then a verification loader then OTP verification succefull widget
if user selectd IVR verification then show a message like IVR request is started please verify the details through it after it show a 10 sec loader then verifcation succfull widget
22)if consent received then show UI like in images NewUser/UI_image/Final_sum_1 , Final_sum_2,Final_sum_3
-- if consent is not received then route to widget  updated BackofficeWOrkitemWidget  

this ends our NTB joureny 

*note* -  for each of 5 steps when we start journey after 5 points show a step number on header left top inside of each main widget like  NewUser/UI_image/step_show.png (it is like green color tick + Step +1/5 dynamic number for each step)

in above points 
till point 6 is same for both NTB and ETB user 
7) but after dedupe check is done and customer is clasiffied as  ETB 
7.1)this is where  ETB journey start - if the customer is ETB we have to populate pre approved offer  formulae and amount all are given in excel (for now nothing is showing blank message is their )(formulae and IBAN master tabs in sheet - check properly as their are rules also written for NTB and ETB seperately in them )
it has two btn go with pre approved offer or need higher amount
8)if user click need higher amount then the journey routes into NTB (starting from 7.1 in NTB flow )flow but rules to be followed for ETB in it 
-- but if customer go with pre approved offer then it  Take customer consent to fetch Bureau records (SIMAH)(point 10 NTB )

9)  Populate Pre Approved amount & Eligibility status  screen like in Image NewUser/UI_image/pre_App_offer_ETB.png 
10)  Ask customer if the maximum amount is okay or wants more?
10.1) if user ask for higher amount then show a loader and show BackofficeWOrkitemWidget (update the widget like this shown in image NewUser/UI_image/Backoffice_send_widget.png )
11)  if user accepts the offer then  Ask customer to select desired finance amount & tenure using slider  (this step  UI should look like shown in the image (make UI modification like image kept in NewUser/UI_image/accept_eligible_status.png )) but (max amount to be set as Pre Approved Offer amount)
12)  after user selects the desired and proceed then show the user summary of the offer he hold now in financesummarywidegt (show this step like  like image kept in NewUser/UI_image/summary_amount.png ))
- if user clicks need higher amount then show previous widget so that user can change or update the amount and other things 
13) after this journney will be same from point 15 of the NTB journey but the data will be ETB ohk 

make sure the cross journey shft from NTB flow to ETB flow or visa versa should be implemented properly but rules or data should according to excel sheet check properly 
ask if any doubt dont halucinate 
also you need to check current flow copmare with flow i told you then make a plan accordingly and implement what needs to be added , updated , or remove 
make a proper plan and implement

yes their are promt files also make sure to update them according to the flow so that LLM response dont come wrong or improper 