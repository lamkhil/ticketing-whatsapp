import React, { useState,useContext } from "react";

import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";

import {
	Avatar,
	Button,
	CssBaseline,
	TextField,
	Select,
	Grid,
	Box,
	Typography,
	Container,
	InputAdornment,
	IconButton,
	Link,
	MenuItem
} from '@material-ui/core';

import { LockOutlined, Visibility, VisibilityOff } from '@material-ui/icons';


import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";

import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	paper: {
		marginTop: theme.spacing(8),
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%",
		marginTop: theme.spacing(3),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
}));

const Download = () => {
	const classes = useStyles();
	const history = useHistory();

	const initialState = {
		perpage: "",
		page: "",
		start: "",
		end: "",
		whatsappId: "",
	};

	const [param] = useState(initialState);

	const { whatsApps, loading } = useContext(WhatsAppsContext);

	const handleDownload = async values => {
		try {
			window.open(`${api.defaults.baseURL}/download?perpage=${values.perpage}&page=${values.page}&start=${values.start}&end=${values.end}&whatsappId=${values.whatsappId}`, '_blank');
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<Container component="main" maxWidth="xs">
			<CssBaseline />
			<br />
			<Typography component="h1" variant="h5">
				Download Data
			</Typography>
			<br />
			{/* <form className={classes.form} noValidate onSubmit={handleSignUp}> */}

			<a href="https://api.aturchat.com/download" target="_blank">
				<Button
					type="button"
					fullWidth
					variant="contained"
					color="primary"
				>
					Download Semua
				</Button>
			</a>
			<Formik
				initialValues={param}
				enableReinitialize={true}
				onSubmit={(values, actions) => {
					setTimeout(() => {
						handleDownload(values);
						actions.setSubmitting(false);
					}, 400);
				}}
			>
				{({ touched, errors, isSubmitting }) => (
					<Form className={classes.form}>
						<Grid container spacing={2}>
							<Grid item xs={12}>
								<Field
									as={TextField}
									autoComplete="perpage"
									name="perpage"
									error={touched.perpage && Boolean(errors.perpage)}
									helperText={touched.perpage && errors.perpage}
									variant="outlined"
									fullWidth
									id="perpage"
									label={"Perpage"}
									type="number"
									autoFocus
								/>
							</Grid>

							<Grid item xs={12}>
								<Field
									as={TextField}
									variant="outlined"
									fullWidth
									id="page"
									label={"Page"}
									name="page"
									type="number"
									error={touched.page && Boolean(errors.page)}
									helperText={touched.page && errors.page}
									autoComplete="page"
								/>
							</Grid>

							<Grid item xs={12}>
								<Field
									as={TextField}
									variant="outlined"
									fullWidth
									name="start"
									id="start"
									autoComplete="start"
									error={touched.start && Boolean(errors.start)}
									helperText={touched.start && errors.start}
									label={"Start"}
									type={'date'}
								/>
							</Grid>
							<Grid item xs={12}>
								<Field
									as={TextField}
									variant="outlined"
									fullWidth
									name="end"
									id="end"
									autoComplete="end"
									error={touched.end && Boolean(errors.end)}
									helperText={touched.end && errors.end}
									label={"End"}
									type={'date'}
								/>
							</Grid>

							<Grid item xs={12}>
								{loading ?
									<>Loading...</> : <Field
										as={Select}
										variant="outlined"
										fullWidth
										name="whatsappId"
										id="whatsappId"
										autoComplete="whatsappId"
										error={touched.whatsappId && Boolean(errors.whatsappId)}
										helperText={touched.whatsappId && errors.whatsappId}
										label={"Akun"}
										placeholder={"Akun"}
									>
										<option key={''} value="">-- Pilih Akun --</option>
										{whatsApps.map(whatsapp => (
											<MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
										))}
									</Field>
								}
							</Grid>
						</Grid>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
							className={classes.submit}
						>
							Download
						</Button>

					</Form>
				)}
			</Formik>
			
			<Box mt={5}>{/* <Copyright /> */}</Box>
		</Container>
	);
};

export default Download;
