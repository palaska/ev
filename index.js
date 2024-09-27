const dotenv = require("dotenv");
dotenv.config();

let capital = parseInt(process.env.CAPITAL);
let investment_rate_pct = 6;

let renovation = 100_000;

let current_rent = 3500;

let annual_service_charge = 0;
let annual_rent_increase_pct = 3;
let annual_service_charge_increase_pct = 5;

let mortgage_amount = parseInt(process.env.MORTGAGE_AMOUNT);
let mortgage_duration_years = 30;
let house_value_yearly_appreciation_pct = 2;

let ltv = 0.6;
let minimum_house_value = mortgage_amount / ltv;
let house_value = minimum_house_value;

let timeline_years = 15;

// covers the next 15 years
let mortgage_rate_in_years = [
  3.82,
  3.82,
  3.82,
  3.82,
  3.82, // 5 years fixed hsbc 60% LTV

  2.5,
  2.5,
  2.5,
  2.5,
  2.5,

  2,
  2,
  2,
  2,
  2,
];

if ([process.env.CAPITAL, process.env.MORTGAGE_AMOUNT].some((v) => !v)) {
  throw new Error("Environment variables are missing");
}

for (let i = 0; i <= 4; i++) {
  house_value = minimum_house_value + i * 100_000;
  if_buy();
}

function if_rent() {
  let final_capital = compound_capital(
    capital,
    investment_rate_pct,
    timeline_years
  );
  let total_spent_to_rent = compound_rent();
  let final_nav = final_capital - total_spent_to_rent;
  console.log(
    `Renting, Final NAV: £${Math.floor(final_nav).toLocaleString()}\n`
  );
}

function if_buy() {
  console.log(
    `Buying a house for £${Math.floor(
      house_value
    ).toLocaleString()} and renovating for £${renovation.toLocaleString()}`
  );

  let today_spent =
    house_value -
    mortgage_amount +
    calculate_stamp_duty(house_value) +
    renovation;

  let today_capital = capital - today_spent;
  if (today_capital < 0) {
    throw new Error(
      `You don't have enough capital to buy the house, you are ${
        today_capital * -1
      } GBP short.`
    );
  }

  let final_capital = compound_capital(
    today_capital,
    investment_rate_pct,
    timeline_years
  );

  let final_home_value = compound_capital(
    house_value + renovation,
    house_value_yearly_appreciation_pct,
    timeline_years
  );

  let total_mortgage_paid = compute_mortgage_paid();
  let do_i_paid_all_mortgage = mortgage_duration_years <= timeline_years;
  let remaining_mortgage_debt = (() => {
    if (do_i_paid_all_mortgage) {
      return 0;
    } else {
      return (
        mortgage_amount *
        ((mortgage_duration_years - timeline_years) / mortgage_duration_years)
      );
    }
  })();

  let total_service_charge_paid = compound_service_charge();

  let final_nav =
    final_capital +
    final_home_value -
    total_mortgage_paid -
    remaining_mortgage_debt -
    total_service_charge_paid;

  console.log(`Buying final NAV: £${Math.floor(final_nav).toLocaleString()}\n`);
}

if_rent();

function compute_mortgage_paid() {
  let totalPaid = 0;
  let remainingAmount = mortgage_amount;
  let monthly_payments_per_year = [];

  // Loop through each year
  for (
    let year = 0;
    year < Math.min(mortgage_duration_years, timeline_years);
    year++
  ) {
    const yearlyRate = mortgage_rate_in_years[year];
    const monthlyRate = yearlyRate / 12 / 100;
    const monthsInYear = 12;
    const totalMonths = (mortgage_duration_years - year) * 12; // remaining months

    // Calculate monthly payment using the mortgage formula for the remaining balance
    const monthlyPayment =
      (remainingAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1);

    monthly_payments_per_year.push(monthlyPayment);

    // Update remaining balance after one year of payments
    const yearlyPayment = monthlyPayment * monthsInYear;
    totalPaid += yearlyPayment;

    // Calculate how much of the yearly payment goes towards interest and principal
    for (let month = 1; month <= monthsInYear; month++) {
      const interestPaid = remainingAmount * monthlyRate;
      const principalPaid = monthlyPayment - interestPaid;
      remainingAmount -= principalPaid;
    }
  }

  console.log(
    `Monthly mortgage payments for every year ${monthly_payments_per_year
      .map((p) => `£${Math.floor(p)}`)
      .join(", ")}`
  );

  // Return the total amount paid over the mortgage period
  return totalPaid;
}

function compound_service_charge() {
  let _total_paid = 0;
  let current_annual_service_charge = annual_service_charge;
  for (let i = 0; i < timeline_years; i++) {
    _total_paid += current_annual_service_charge;
    current_annual_service_charge *=
      1 + annual_service_charge_increase_pct / 100;
  }

  return _total_paid;
}

function compound_rent() {
  let _total_rent_paid = 0;
  let _current_rent = current_rent;
  for (let i = 0; i < timeline_years; i++) {
    _total_rent_paid += _current_rent * 12;
    _current_rent *= 1 + annual_rent_increase_pct / 100;
  }

  return _total_rent_paid;
}

function compound_capital(principal, rate, years) {
  return principal * Math.pow(1 + rate / 100, years);
}

function calculate_stamp_duty(price) {
  let tax = 0;

  if (price > 1500000) {
    tax += (price - 1500000) * 0.12;
    price = 1500000;
  }

  if (price > 925000) {
    tax += (price - 925000) * 0.1;
    price = 925000;
  }

  if (price > 250000) {
    tax += (price - 250000) * 0.05;
    price = 250000;
  }

  return tax;
}
